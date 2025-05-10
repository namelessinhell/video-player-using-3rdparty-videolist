<template>
  <v-app>
    <v-app-bar color="primary">
      <v-app-bar-title>Video Browser</v-app-bar-title>
      <v-btn @click="refreshData" icon>
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
      <v-btn @click="showOfflineData = !showOfflineData" icon>
        <v-icon>mdi-database</v-icon>
      </v-btn>
      <v-btn @click="syncData" icon :loading="syncing">
        <v-icon>mdi-sync</v-icon>
      </v-btn>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item
          v-for="(subcats, group) in CATEGORY_GROUPS"
          :key="group"
          :value="group"
        >
          <v-list-group>
            <template v-slot:activator="{ props }">
              <v-list-item
                v-bind="props"
                :title="group"
              ></v-list-item>
            </template>

            <v-list-item
              v-for="catId in subcats"
              :key="catId"
              :value="catId"
              :title="getCategoryName(catId)"
              @click="selectCategory(catId)"
              :active="selectedCategory === catId"
            ></v-list-item>
          </v-list-group>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container fluid>
        <v-row>
          <v-col cols="12" md="8"  class="mx-auto">
            <v-btn @click="drawer = !drawer" color="primary" class="mb-4">
              <v-icon>mdi-menu</v-icon> Categories
            </v-btn>

            <video-player
              v-if="currentVideo"
              :src="currentVideo.vod_play_url"
              :title="currentVideo.vod_name"
              @close="currentVideo = null"
            />

            <v-alert
              v-if="error"
              type="error"
              class="mb-4"
            >
              {{ error }}
            </v-alert>

            <v-text-field
              v-model="search"
              label="Search videos"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              clearable
              class="mb-4"
            />

            <v-progress-linear
              v-if="loading"
              indeterminate
              color="primary"
              class="mb-4"
            />

            <v-card v-if="showOfflineData">
              <v-card-title class="d-flex justify-space-between">
                <span>Offline Data</span>
                <v-btn
                  @click="clearDatabase"
                  color="error"
                  size="small"
                  variant="text"
                >
                  Clear
                </v-btn>
              </v-card-title>
              <v-card-text>
                <p>Stored videos: {{ offlineVideos.length }}</p>
                <p>Last updated: {{ lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never' }}</p>
              </v-card-text>
            </v-card>

            <h3 class="mb-4">{{ currentCategoryName }}</h3>

            <video-list
              :videos="filteredVideos"
              :has-more="hasMorePages"
              :loading-more="loading"
              @play="playVideo"
              @load-more="loadNextPage"
              class="mt-4"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import VideoList from '@/components/VideoList.vue'
import { useIntervalFn } from '@vueuse/core'
import { ref, computed, onMounted, watch } from 'vue'
import { useIndexedDb } from './composables/useIndexedDb'
import VideoPlayer from '@/components/VideoPlayer.vue'

const CAT_LIST = {
  "20":"全部电影","22":"冒险片","24":"剧情片","26":"动作片","28":"动画电影","32":"喜剧片",
  "34":"奇幻片","36":"恐怖片","38":"悬疑片","40":"惊悚片","42":"歌舞片","44":"灾难片",
  "46":"爱情片","48":"科幻片","50":"犯罪片","52":"经典片","54":"网络电影","56":"战争片",
  "60":"全部电视剧","62":"欧美剧","64":"日剧","66":"韩剧","68":"台剧","70":"泰剧","72":"国产剧",
  "74":"港剧","76":"新马剧","78":"其他剧","80":"全部动漫","82":"全部综艺","86":"全部纪录片","96":"欧美动漫",
  "98":"日韩动漫","100":"国产动漫","102":"新马泰动漫","104":"港台动漫","106":"其他动漫",
  "108":"国产综艺","110":"日韩综艺","112":"欧美综艺","114":"新马泰综艺","116":"港台综艺",
  "118":"其他综艺","120":"短剧","122":"预告片"
}

const CATEGORY_GROUPS = {
  "Movies": ["20","22","24","26","28","32","34","36","38","40","42","44","46","48","50","52","54","56"],
  "TV Shows": ["60","62","64","66","68","70","72","74","76","78"],
  "Animation": ["80","96","98","100","102","104","106"],
  "Variety": ["82","108","110","112","114","116","118"],
  "Other": ["86","120","122"]
}

function getCategoryName(id) {
  return CAT_LIST[id] || "Unknown Category"
}

const drawer = ref(false)
const selectedCategory = ref('20') // Default to movies
const currentCategoryName = computed(() => getCategoryName(selectedCategory.value))

const syncing = ref(false)
const syncInterval = ref(30 * 60 * 1000) // 30 minutes
const API_URL = computed(() => `https://cjhwba.com/api.php/provide/vod/?ac=videolist&t=${selectedCategory.value}&pg=`)

// State
const loading = ref(false)
const error = ref(null)
const videos = ref([])
const offlineVideos = ref([])
const currentPage = ref(1)
const totalPages = ref(1)
const hasMorePages = computed(() => currentPage.value < totalPages.value)
const search = ref('')
const currentVideo = ref(null)
const showOfflineData = ref(false)
const lastUpdated = ref(null)

// Initialize IndexedDB
const {
  getAllVideos,
  storeVideos,
  clearDatabase: clearIndexedDb,
  getOutdatedVideos,
  updateVideos,
  getLastUpdated
} = useIndexedDb()

// Computed
const filteredVideos = computed(() => {
  const source = showOfflineData.value ? offlineVideos.value : videos.value
  if (!search.value) return source

  return source.filter(video =>
    video.vod_name.toLowerCase().includes(search.value.toLowerCase()) ||
    video.vod_actor?.toLowerCase().includes(search.value.toLowerCase()) ||
    video.vod_director?.toLowerCase().includes(search.value.toLowerCase()) ||
    video.vod_content?.toLowerCase().includes(search.value.toLowerCase())
  )
})

const syncData = async () => {
  try {
    syncing.value = true
    error.value = null

    // Check for outdated videos
    const outdatedVideos = await getOutdatedVideos()
    const outdatedIds = outdatedVideos.map(v => v.vod_id)

    if (outdatedIds.length > 0) {
      // Fetch fresh data for outdated videos
      const response = await fetch(`${API_URL.value}${currentPage.value}`)
      if (!response.ok) throw new Error('Failed to fetch videos')

      const data = await response.json()
      const freshVideos = data.list || []

      // Filter only the videos that need updating
      const videosToUpdate = freshVideos.filter(v => outdatedIds.includes(v.vod_id))

      if (videosToUpdate.length > 0) {
        await updateVideos(outdatedIds, videosToUpdate)

        // Reload offline data if we're viewing it
        if (showOfflineData.value) {
          await loadOfflineVideos()
        }
      }
    }

    // Also update the lastUpdated timestamp
    lastUpdated.value = await getLastUpdated()
  } catch (err) {
    error.value = 'Sync failed: ' + err.message
    console.error('Sync error:', err)
  } finally {
    syncing.value = false
  }
}

// Add auto-sync functionality
useIntervalFn(() => {
  if (!showOfflineData.value) {
    syncData()
  }
}, syncInterval)

// Methods
const selectCategory = (catId) => {
  selectedCategory.value = catId
  currentPage.value = 1
  if (showOfflineData.value) {
    loadOfflineVideos()
  } else {
    fetchVideos()
  }
  drawer.value = false
}

const fetchVideos = async (page = 1) => {
  try {
    loading.value = true
    error.value = null

    const response = await fetch(`${API_URL.value}${page}`)
    if (!response.ok) throw new Error('Failed to fetch videos')

    const data = await response.json()

    if (page === 1) {
      videos.value = data.list || []
    } else {
      videos.value = [...videos.value, ...(data.list || [])]
    }

    totalPages.value = data.pagecount || 1
    currentPage.value = page

    // Store in IndexedDB with current timestamp
    await storeVideos(data.list, Date.now())
    lastUpdated.value = Date.now()
  } catch (err) {
    error.value = err.message
    console.error('Fetch error:', err)
  } finally {
    loading.value = false
  }
}

const loadNextPage = async () => {
  if (hasMorePages.value && !loading.value) {
    await fetchVideos(currentPage.value + 1)
  }
}

const refreshData = () => {
  if (showOfflineData.value) {
    loadOfflineVideos()
  } else {
    fetchVideos(currentPage.value)
  }
}

const playVideo = (video) => {
  currentVideo.value = {
    title: video.vod_name,
    vod_play_url: video.vod_play_url,
    options: {
      theme: '#ff5252',
      hotkey: true
    }
  }
}

const loadOfflineVideos = async () => {
  try {
    loading.value = true
    const storedVideos = await getAllVideos()
    offlineVideos.value = storedVideos
    lastUpdated.value = await getLastUpdated()
  } catch (err) {
    error.value = 'Failed to load offline videos'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const clearDatabase = async () => {
  try {
    await clearIndexedDb()
    offlineVideos.value = []
    lastUpdated.value = null
  } catch (err) {
    error.value = 'Failed to clear database'
    console.error(err)
  }
}

// Watchers
watch(currentPage, (newPage) => {
  if (!showOfflineData.value) {
    fetchVideos(newPage)
  }
})

watch(showOfflineData, (show) => {
  if (show) {
    loadOfflineVideos()
  } else {
    fetchVideos(currentPage.value)
  }
})

// Lifecycle hooks
onMounted(async () => {
  await fetchVideos(1)
})
</script>

<style scoped>
.v-navigation-drawer {
  width: 240px !important;
}
</style>