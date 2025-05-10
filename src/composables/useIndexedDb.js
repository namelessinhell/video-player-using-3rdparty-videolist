import { Dexie } from 'dexie'

const db = new Dexie('VideoDatabase')
db.version(1).stores({
  videos: '++id, vod_id, vod_name, vod_pic, vod_year, vod_play_url, last_updated',
  metadata: 'key, value'
})

export const useIndexedDb = () => {
  const storeVideos = async (videos, timestamp = Date.now()) => {
    try {
      // Add last_updated timestamp to each video
      const videosWithTimestamps = videos.map(video => ({
        ...video,
        last_updated: timestamp
      }))

      await db.videos.bulkPut(videosWithTimestamps)
      await db.metadata.put({ key: 'lastUpdated', value: timestamp })
    } catch (err) {
      console.error('Error storing videos:', err)
      throw err
    }
  }

  const getAllVideos = async () => {
    try {
      return await db.videos.toArray()
    } catch (err) {
      console.error('Error fetching videos:', err)
      throw err
    }
  }

  const getLastUpdated = async () => {
    try {
      const record = await db.metadata.get('lastUpdated')
      return record ? record.value : null
    } catch (err) {
      console.error('Error getting last updated:', err)
      return null
    }
  }

  const clearDatabase = async () => {
    try {
      await db.videos.clear()
      await db.metadata.clear()
    } catch (err) {
      console.error('Error clearing database:', err)
      throw err
    }
  }

  const getOutdatedVideos = async (threshold = 24 * 60 * 60 * 1000) => {
    try {
      const cutoff = Date.now() - threshold
      return await db.videos
        .where('last_updated')
        .below(cutoff)
        .toArray()
    } catch (err) {
      console.error('Error getting outdated videos:', err)
      return []
    }
  }

  const updateVideos = async (videoIds, newData) => {
    try {
      const updates = newData.map(video => ({
        ...video,
        last_updated: Date.now()
      }))

      await db.videos.bulkPut(updates)
    } catch (err) {
      console.error('Error updating videos:', err)
      throw err
    }
  }

  return {
    storeVideos,
    getAllVideos,
    getLastUpdated,
    clearDatabase,
    getOutdatedVideos,
    updateVideos
  }
}