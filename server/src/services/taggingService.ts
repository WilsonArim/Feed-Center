import OpenAI from 'openai'
import { env } from '../config.js'
import { VALID_TOPICS, type Topic } from '../types/news.js'

const openai = new OpenAI({ apiKey: env.openaiKey })

interface TagResult {
    topic_primary: Topic
    tags: string[]
    tag_confidence: number
}

/**
 * Use LLM to classify a news item into topics and tags.
 * Returns primary topic, full tag array, and confidence score.
 */
export async function tagNewsItem(title: string, summary: string, topicHint?: string): Promise<TagResult> {
    const validTopics = VALID_TOPICS.join(', ')

    const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: `You are a news classifier. Given a news title and summary, classify it.

Available topics: [${validTopics}]

Return JSON:
{
  "topic_primary": "one of the topics above",
  "tags": ["array of all matching topics"],
  "tag_confidence": 0.0-1.0
}

Rules:
- topic_primary MUST be one of: ${validTopics}
- tags should include ALL matching topics
- tag_confidence reflects how sure you are about the classification
- If a topic_hint is provided, consider it but don't blindly follow it`,
            },
            {
                role: 'user',
                content: `Title: ${title}\nSummary: ${summary}${topicHint ? `\nTopic hint: ${topicHint}` : ''}`,
            },
        ],
    })

    const raw = JSON.parse(res.choices[0]?.message?.content || '{}')

    // Validate and sanitize
    const topicPrimary = VALID_TOPICS.includes(raw.topic_primary) ? raw.topic_primary : 'Tech'
    const tags = Array.isArray(raw.tags)
        ? raw.tags.filter((t: string) => VALID_TOPICS.includes(t as Topic))
        : [topicPrimary]
    const confidence = typeof raw.tag_confidence === 'number'
        ? Math.max(0, Math.min(1, raw.tag_confidence))
        : 0.5

    return { topic_primary: topicPrimary, tags, tag_confidence: confidence }
}
