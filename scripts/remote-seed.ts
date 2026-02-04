
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

const DATA_DIR = path.join(process.cwd(), 'data')
const DOCS_DIR = path.join(process.cwd(), 'docs/training-knowledge')

async function main() {
    const appUrl = process.env.APP_URL
    const adminKey = process.env.HUGGINGFACE_API_KEY

    if (!appUrl || !adminKey) {
        console.error('Missing configuration. Usage:')
        console.error('export APP_URL=https://your-app.run.app')
        console.error('export HUGGINGFACE_API_KEY=hf_...')
        console.error('npx ts-node scripts/remote-seed.ts')
        process.exit(1)
    }

    const documents = []

    // 1. Parse Text Rules
    if (fs.existsSync(DOCS_DIR)) {
        const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.txt'))
        for (const file of files) {
            const content = fs.readFileSync(path.join(DOCS_DIR, file), 'utf-8')
            if (content.trim()) {
                documents.push({
                    id: file,
                    title: file.replace('.txt', ''),
                    content: content,
                    type: 'EXPERT_RULES'
                })
            }
        }
    }

    // 2. Parse CSVs
    if (fs.existsSync(DATA_DIR)) {
        const csvFiles = fs.readdirSync(DATA_DIR).filter(f => f.toLowerCase().endsWith('.csv'))
        for (const file of csvFiles) {
            const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8')
            const lines = content.split(/\r?\n/)

            // CSV Helper
            const parseCSVLine = (line: string) => {
                const matches = []
                let currentMatch = ''
                let inQuote = false
                for (let i = 0; i < line.length; i++) {
                    const char = line[i]
                    if (char === '"') {
                        inQuote = !inQuote
                    } else if (char === ',' && !inQuote) {
                        matches.push(currentMatch)
                        currentMatch = ''
                    } else {
                        currentMatch += char
                    }
                }
                matches.push(currentMatch)
                return matches.map(m => m.trim().replace(/^"|"$/g, ''))
            }

            let currentWeek = 'Unknown'

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i]
                const cols = parseCSVLine(line)

                if (cols[1] && cols[1].startsWith('Du ') && cols[1].includes('Au ')) {
                    currentWeek = cols[1]
                }

                if (cols[0] && cols[0].toUpperCase() === 'SEANCES') {
                    const days = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE']
                    for (let d = 0; d < 7; d++) {
                        const sessionContent = cols[d + 1]
                        if (sessionContent && sessionContent.length > 5) {
                            const docId = `csv_${file.replace(/[\s\.]+/g, '_')}_${currentWeek.replace(/[\s\/]+/g, '_')}_${days[d]}`
                            documents.push({
                                id: docId,
                                title: `Exemple Séance ${days[d]} (${file})`,
                                content: `Exemple de séance réelle (${days[d]}, Semaine ${currentWeek}):\n${sessionContent}`,
                                type: 'CSV_HISTORY'
                            })
                        }
                    }
                }
            }
        }
    }

    console.log(`Prepared ${documents.length} documents. Sending to ${appUrl}/api/admin/ingest ...`)

    // Batch send to avoid huge payload
    const BATCH_SIZE = 10
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const batch = documents.slice(i, i + BATCH_SIZE)
        console.log(`Sending batch ${i} - ${i + batch.length}...`)

        try {
            const res = await fetch(`${appUrl}/api/admin/ingest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': adminKey
                },
                body: JSON.stringify({ documents: batch })
            })

            if (!res.ok) {
                const txt = await res.text()
                console.error('Failed:', res.status, txt)
            } else {
                const json = await res.json()
                console.log('Success:', json)
            }
        } catch (err) {
            console.error('Network Error:', err)
        }
    }
}

main().catch(console.error)
