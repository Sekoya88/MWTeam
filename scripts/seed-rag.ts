
import { PrismaClient } from '@prisma/client'
import { HfInference } from '@huggingface/inference'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY
const RAG_EMBEDDING_MODEL = 'sentence-transformers/all-mpnet-base-v2'

if (!HUGGINGFACE_API_KEY) {
    console.error('HUGGINGFACE_API_KEY required')
    process.exit(1)
}

const hf = new HfInference(HUGGINGFACE_API_KEY)

async function main() {
    console.log('🌱 Seeding RAG Database...')

    const docsDir = path.join(process.cwd(), 'docs', 'training-knowledge')
    if (!fs.existsSync(docsDir)) {
        console.error('Directory not found:', docsDir)
        return
    }


    // Process Text Files (Expert Rules)
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.txt'))

    for (const file of files) {
        console.log(`Processing Rule File: ${file}...`)
        const content = fs.readFileSync(path.join(docsDir, file), 'utf-8')
        const chunks = [content]

        for (const chunk of chunks) {
            if (!chunk.trim()) continue
            console.log('Generating embedding for rule...')
            const embedding = await hf.featureExtraction({
                model: RAG_EMBEDDING_MODEL,
                inputs: chunk
            }) as number[]

            const vectorString = `[${embedding.join(',')}]`
            await prisma.$executeRaw`
            INSERT INTO rag_documents (id, titre, contenu, source_type, embedding)
            VALUES (
                ${file}, 
                ${file.replace('.txt', '')}, 
                ${chunk}, 
                'EXPERT_RULES', 
                ${vectorString}::vector
            )
            ON CONFLICT (id) DO UPDATE SET 
                contenu = EXCLUDED.contenu, 
                embedding = EXCLUDED.embedding;
        `
            console.log(`Stored ${file} into DB.`)
        }
    }

    // Process CSV Data (Historical Plans)
    const dataDir = path.join(process.cwd(), 'data')
    if (fs.existsSync(dataDir)) {
        const csvFiles = fs.readdirSync(dataDir).filter(f => f.toLowerCase().endsWith('.csv'))
        console.log(`Found ${csvFiles.length} CSV files in data/`)

        for (const file of csvFiles) {
            console.log(`Processing CSV: ${file}...`)
            const content = fs.readFileSync(path.join(dataDir, file), 'utf-8')
            const lines = content.split(/\r?\n/)

            let currentWeek = 'Unknown'

            // Basic CSV Parser (handling quotes for "1,5")
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
                return matches.map(m => m.trim().replace(/^"|"$/g, '')) // Unquote
            }

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i]
                const cols = parseCSVLine(line)

                // Detect Week (e.g. "Du 04/08/2025 Au ...")
                if (cols[1] && cols[1].startsWith('Du ') && cols[1].includes('Au ')) {
                    currentWeek = cols[1]
                }

                // Detect SEANCES row
                if (cols[0] && cols[0].toUpperCase() === 'SEANCES') {
                    // Days are usually cols 1 to 7 (Lundi...Dimanche)
                    const days = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE']

                    for (let d = 0; d < 7; d++) {
                        const sessionContent = cols[d + 1] // Col 1 is Lundi
                        if (sessionContent && sessionContent.length > 5) { // Ignore empty or too short
                            const docId = `csv_${file.replace(/\s+/g, '_')}_${currentWeek.replace(/\s+/g, '_')}_${days[d]}`
                            const title = `Exemple Séance ${days[d]} (${file.replace('.csv', '')})`
                            const fullContent = `Exemple de séance réelle (${days[d]}, Semaine ${currentWeek}):\n${sessionContent}`

                            console.log(` -> Ingesting session: ${days[d]}...`)

                            const embedding = await hf.featureExtraction({
                                model: RAG_EMBEDDING_MODEL,
                                inputs: fullContent
                            }) as number[]

                            const vectorString = `[${embedding.join(',')}]`

                            await prisma.$executeRaw`
                            INSERT INTO rag_documents (id, titre, contenu, source_type, embedding)
                            VALUES (
                                ${docId}, 
                                ${title}, 
                                ${fullContent}, 
                                'CSV_HISTORY', 
                                ${vectorString}::vector
                            )
                            ON CONFLICT (id) DO UPDATE SET 
                                contenu = EXCLUDED.contenu, 
                                embedding = EXCLUDED.embedding;
                        `
                        }
                    }
                }
            }
        }
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
