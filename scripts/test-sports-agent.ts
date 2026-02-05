
import { SportsRagAgent } from '../lib/agents/sports-rag-agent'
import { searchContext } from '../lib/rag'

async function main() {
    const query = process.argv[2] || "Planifie une semaine de 800m pour préparer les championnats d'été"

    console.log(`🔎 Testing SportsRagAgent with query: "${query}"`)
    console.log(`⚙️  Examples of valid usage: `)
    console.log(`   npx ts-node scripts/test-sports-agent.ts "Comment travailler la VMA ?"`)

    // 1. Retrieve Context
    console.log('\n📚 Retrieving context from RAG...')
    const context = await searchContext(query, 3)
    console.log(`   -> Found ${context.length} characters of context.`)

    // 2. Initialize Agent
    const agent = new SportsRagAgent({
        name: 'SportsRagTest',
        model: process.env.OLLAMA_MODEL || 'qwen3:8b',
        temperature: 0.1, // Low temp for strict JSON
    })

    // 3. Execute
    console.log('\n🤖 Agent processing...')
    const result = await agent.execute({
        query,
        context,
    })

    if (result.success && result.data) {
        console.log('\n✅ SUCCESS! JSON Parsed correctly.')
        console.log('---------------------------------------------------')
        console.log(JSON.stringify(result.data, null, 2))
        console.log('---------------------------------------------------')

        // Basic validation check
        const data = result.data
        if (data.artifacts?.training_plan?.weekly_sessions) {
            console.log(`📅 Plan generated for ${data.artifacts.training_plan.duration_weeks} weeks.`)
            console.log(`🏃 Total Weekly Volume: ${data.artifacts.training_plan.weekly_volume_km} km`)
            console.log(`📝 ${data.artifacts.training_plan.weekly_sessions.length} sessions defined.`)

            // Check first session detailed fields
            const firstSession = data.artifacts.training_plan.weekly_sessions[0]
            if (firstSession) {
                console.log('\n🔎 Sample Session (Day 1):')
                console.log(`   - Type: ${firstSession.session_type}`)
                console.log(`   - Vol: ${firstSession.volume_km} km`)
                console.log(`   - Zones:`, firstSession.zones_km)
            }
        } else {
            console.warn('⚠️  Warning: Missing training_plan structure.')
        }

    } else {
        console.error('\n❌ FAILURE:')
        console.error(result.error)
        if (result.rawResponse) {
            console.log('\nRaw Response:')
            console.log(result.rawResponse)
        }
    }
}

main().catch(console.error)
