import { supabase } from '@/lib/supabase'
import { offlineStorage } from '@/services/cache/offlineStorage'

export interface Link {
    id: string
    user_id: string
    url: string
    title: string | null
    description: string | null
    favicon_url: string | null
    tags: string[]
    notes: string | null
    pinned: boolean
    is_dead: boolean
    last_checked: string | null
    created_at: string
    updated_at: string
}

export type CreateLinkInput = Pick<Link, 'url'> &
    Partial<Pick<Link, 'title' | 'description' | 'tags' | 'notes' | 'pinned'>>

export type UpdateLinkInput = Partial<
    Pick<Link, 'url' | 'title' | 'description' | 'tags' | 'notes' | 'pinned' | 'is_dead'>
>

interface GetLinksOptions {
    search?: string
    tag?: string
    pinned?: boolean
}

function faviconUrl(url: string): string {
    try {
        const domain = new URL(url).hostname
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    } catch {
        return ''
    }
}

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '')
    } catch {
        return url
    }
}

export const linksService = {
    async getLinks(userId: string, options?: GetLinksOptions): Promise<Link[]> {
        try {
            // 1. Try Network
            let query = supabase
                .from('links')
                .select('*')
                .eq('user_id', userId)
                .order('pinned', { ascending: false })
                .order('created_at', { ascending: false })

            if (options?.tag) query = query.contains('tags', [options.tag])
            if (options?.pinned !== undefined) query = query.eq('pinned', options.pinned)

            // Search is done in DB for now, but could be local if offline
            if (options?.search) {
                query = query.or(
                    `title.ilike.%${options.search}%,url.ilike.%${options.search}%,description.ilike.%${options.search}%`
                )
            }

            const { data, error } = await query
            if (error) throw error

            // 2. Cache Validation (Background)
            // Save to offline storage for future use
            if (data) {
                offlineStorage.saveLinks(data as Link[]).catch(console.error)
            }

            return data as Link[]
        } catch (error) {
            // 3. Fallback to Offline
            console.warn('Network failed, falling back to offline links', error)
            const offlineLinks = await offlineStorage.getLinks()

            // Apply filtering locally since DB query failed
            let filtered = offlineLinks.filter(l => l.user_id === userId)

            if (options?.tag) filtered = filtered.filter(l => l.tags.includes(options.tag!))
            if (options?.pinned !== undefined) filtered = filtered.filter(l => l.pinned === options.pinned)
            if (options?.search) {
                const s = options.search.toLowerCase()
                filtered = filtered.filter(l =>
                    l.title?.toLowerCase().includes(s) ||
                    l.url.toLowerCase().includes(s) ||
                    l.description?.toLowerCase().includes(s)
                )
            }

            // Sort manually
            return filtered.sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            })
        }
    },

    async createLink(userId: string, input: CreateLinkInput): Promise<Link> {
        const favicon = faviconUrl(input.url)

        // Smart Title Fallback
        const autoTitle = input.title || extractDomain(input.url)

        const { data, error } = await supabase
            .from('links')
            .insert({
                user_id: userId,
                url: input.url,
                title: autoTitle,
                description: input.description || null,
                favicon_url: favicon,
                tags: input.tags || [],
                notes: input.notes || null,
                pinned: input.pinned || false,
                created_at: new Date().toISOString(), // Optimistic for consistency
            })
            .select()
            .single()

        if (error) throw error

        // Save to offline cache
        await offlineStorage.saveLinks([data as Link])

        return data as Link
    },

    async updateLink(id: string, userId: string, input: UpdateLinkInput): Promise<Link> {
        const updates: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() }

        if (input.url) {
            updates.favicon_url = faviconUrl(input.url)
        }

        const { data, error } = await supabase
            .from('links')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single()

        if (error) throw error

        // Update cache
        await offlineStorage.saveLinks([data as Link])

        return data as Link
    },

    async deleteLink(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('links')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)

        if (error) throw error

        // We should also remove from offline, but current offlineStorage doesn't support delete yet
        // TODO: Add removeLink to offlineStorage
    },

    async getAllTags(userId: string): Promise<string[]> {
        try {
            const { data, error } = await supabase
                .from('links')
                .select('tags')
                .eq('user_id', userId)

            if (error) throw error

            const tagSet = new Set<string>()
            for (const row of data ?? []) {
                for (const tag of (row.tags as string[]) ?? []) {
                    tagSet.add(tag)
                }
            }
            return [...tagSet].sort()
        } catch (e) {
            // Fallback tags from offline?
            const offline = await offlineStorage.getLinks()
            const tagSet = new Set<string>()
            for (const row of offline ?? []) {
                for (const tag of (row.tags as string[]) ?? []) {
                    tagSet.add(tag)
                }
            }
            return [...tagSet].sort()
        }
    },

    // --- Smart Features ---
    async checkLinkHealth(url: string): Promise<boolean> {
        try {
            // Simple CORS-restricted check
            // We use no-cors which returns opaque response, but if network error it throws
            await fetch(url, { mode: 'no-cors', method: 'HEAD' })
            return true
        } catch {
            return false
        }
    }
}
