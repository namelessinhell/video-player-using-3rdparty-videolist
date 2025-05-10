<template>
  <div
    ref="scroller"
    class="video-list-container"
    @scroll.passive="handleScroll"
  >
    <!-- Desktop/Large Screen Layout -->
    <template v-if="!isMobile">
      <v-row>
        <v-col
          v-for="(item, index) in videos"
          :key="index"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <v-card
            class="ma-2 video-card"
            @click="$emit('play', item)"
          >
            <v-img
              :src="loadedItems.includes(index) ? item.vod_pic : defaultImage"
              :alt="item.vod_name"
              aspect-ratio="1.5"
              cover
              height="200"
              @load="handleImageLoad(index)"
            >
              <template v-slot:placeholder>
                <v-row class="fill-height ma-0" align="center" justify="center">
                  <v-progress-circular indeterminate color="primary"></v-progress-circular>
                </v-row>
              </template>
            </v-img>
            <v-card-title class="text-subtitle-1 text-truncate">{{ item.vod_name }}</v-card-title>
            <v-card-subtitle class="text-truncate">{{ item.vod_year }}</v-card-subtitle>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Mobile Layout -->
    <v-virtual-scroll
      v-else
      :items="videos"
      :item-height="300"
    >
      <template v-slot:default="{ item, index }">
        <v-card
          class="ma-2 video-card"
          @click="$emit('play', item)"
        >
          <v-img
            :src="loadedItems.includes(index) ? item.vod_pic : defaultImage"
            :alt="item.vod_name"
            aspect-ratio="1.5"
            cover
            height="200"
            @load="handleImageLoad(index)"
          >
            <template v-slot:placeholder>
              <v-row class="fill-height ma-0" align="center" justify="center">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
              </v-row>
            </template>
          </v-img>
          <v-card-title class="text-subtitle-1 text-truncate">{{ item.vod_name }}</v-card-title>
          <v-card-subtitle class="text-truncate">{{ item.vod_year }}</v-card-subtitle>
        </v-card>
      </template>
    </v-virtual-scroll>

    <div v-if="loadingMore" class="text-center pa-4">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <div class="mt-2">Loading more videos...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useDisplay } from 'vuetify'

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

const props = defineProps({
  videos: {
    type: Array,
    required: true
  },
  hasMore: {
    type: Boolean,
    default: false
  },
  loadingMore: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['play', 'load-more'])

const scroller = ref(null)
const defaultImage = ref('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlZWVlZWUiLz48L3N2Zz4=')
const loadedItems = ref([])
const observer = ref(null)

const handleImageLoad = (index) => {
  if (!loadedItems.value.includes(index)) {
    loadedItems.value.push(index)
  }
}

const handleScroll = () => {
  if (props.loadingMore || !props.hasMore) return

  const { scrollTop, scrollHeight, clientHeight } = scroller.value
  const threshold = 100 // pixels from bottom to trigger load

  if (scrollHeight - (scrollTop + clientHeight) < threshold) {
    emit('load-more')
  }
}

// Lazy load images when they come into view
const setupIntersectionObserver = () => {
  observer.value = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = parseInt(entry.target.getAttribute('data-index'))
        handleImageLoad(index)
        observer.value.unobserve(entry.target)
      }
    })
  }, {
    root: scroller.value,
    threshold: 0.1
  })

  // Observe all images
  document.querySelectorAll('.video-card img').forEach((img, index) => {
    img.setAttribute('data-index', index)
    observer.value.observe(img)
  })

  // Also observe the sentinel for infinite scroll
  const sentinel = document.createElement('div')
  sentinel.style.height = '1px'
  scroller.value.appendChild(sentinel)
  observer.value.observe(sentinel)
}

onMounted(() => {
  setupIntersectionObserver()
})

onBeforeUnmount(() => {
  if (observer.value) {
    observer.value.disconnect()
  }
})
</script>

<style scoped>
.video-list-container {
  height: calc(100vh - 200px);
  overflow-y: auto;
}

.video-card {
  transition: transform 0.2s;
  cursor: pointer;
}

.video-card:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* Ensure cards have consistent height */
.video-card >>> .v-card-title,
.video-card >>> .v-card-subtitle {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>