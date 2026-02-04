
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

    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.txt'))

    for (const file of files) {
        console.log(`Processing ${file}...`)
        const content = fs.readFileSync(path.join(docsDir, file), 'utf-8')

        // Split content loosely by paragraphs or keep as one chunk if small
        // Here we treat the whole file as one chunk for simplicity of expert rules
        const chunks = [content]

        for (const chunk of chunks) {
            if (!chunk.trim()) continue

            // Generate Embedding
            console.log('Generating embedding...')
            const embedding = await hf.featureExtraction({
                model: RAG_EMBEDDING_MODEL,
                inputs: chunk
            }) as number[]

            // Insert into DB
            // Use raw query for vector insert
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
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
