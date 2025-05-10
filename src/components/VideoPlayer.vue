<template>
  <div class="video-player-container">
    <v-card style="width:100vw">
      <v-card-title class="d-flex justify-space-between align-center">
        <span>{{ title }}</span>
        <v-btn @click="closePlayer" icon variant="text">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <!-- Episode Selection -->
        <div v-if="episodeGroups.length > 1" class="mb-4">
          <div class="text-caption mb-1">Episodes</div>
          <v-btn-toggle
            v-model="selectedEpisodeGroup"
            mandatory
            density="compact"
            class="episode-toggle-group"
          >
            <v-btn
              v-for="(group, index) in episodeGroups"
              :key="index"
              :value="index"
              size="small"
              variant="outlined"
            >
              Episode {{ index + 1 }}
            </v-btn>
          </v-btn-toggle>
        </div>

        <!-- Quality Selection -->
        <div v-if="currentQualities.length > 1" class="mb-4">
          <div class="text-caption mb-1">Quality Options</div>
          <v-btn-toggle
            v-model="selectedQuality"
            mandatory
            density="compact"
            class="quality-toggle-group"
          >
            <v-btn
              v-for="(option, index) in currentQualities"
              :key="index"
              :value="index"
              size="small"
              variant="outlined"
            >
              {{ option.quality }}
            </v-btn>
          </v-btn-toggle>
        </div>

        <!-- Player Container -->
        <div v-if="!isNativePlatform" ref="playerContainer" class="dplayer-container"></div>
        <div v-else ref="nativePlayerContainer" class="native-player-container"></div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import Hls from 'hls.js';
import DPlayer from 'dplayer';
import { Capacitor } from '@capacitor/core';
import ExoPlayer from '@/plugins/ExoPlayer';

export default {
  props: {
    src: {
      type: String,
      required: true
    },
    title: {
      type: String,
      default: 'Video Player'
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const playerContainer = ref(null);
    const nativePlayerContainer = ref(null);
    const selectedEpisodeGroup = ref(0);
    const selectedQuality = ref(0);
    const episodeGroups = ref([]);
    const isNativePlatform = computed(() => Capacitor.isNativePlatform());
    let dp = null;

    // Parse episode groups and quality options
    const parseSources = (urlString) => {
      if (!urlString.includes('#')) {
        // Single episode with possibly multiple qualities
        return [parseQualityOptions(urlString)];
      }

      // Multiple episodes separated by #
      return urlString.split('#').map(episode => {
        return parseQualityOptions(episode);
      });
    };

    // Parse quality options from episode string (e.g., "720P$url")
    const parseQualityOptions = (episodeString) => {
      if (!episodeString.includes('$')) {
        return [{
          quality: 'Default',
          url: episodeString
        }];
      }

      const parts = episodeString.split('$');
      return [{
        quality: parts[0] || 'Default',
        url: parts[1] || episodeString
      }];
    };

    const currentQualities = computed(() => {
      return episodeGroups.value[selectedEpisodeGroup.value] || [];
    });

    const currentSource = computed(() => {
      return currentQualities.value[selectedQuality.value]?.url || props.src;
    });

    const initializePlayer = async () => {
      episodeGroups.value = parseSources(props.src);

      if (isNativePlatform.value) {
        await initializeNativePlayer();
      } else {
        initializeWebPlayer();
      }
    };

    const initializeNativePlayer = async () => {
      try {
        await ExoPlayer.play({
          url: currentSource.value,
          title: `${props.title} - ${currentQualities.value[selectedQuality.value]?.quality}`,
          episode: selectedEpisodeGroup.value + 1
        });
      } catch (err) {
        console.error('Native player error:', err);
        if (!isNativePlatform.value) {
          initializeWebPlayer();
        }
      }
    };

    const initializeWebPlayer = () => {
      const options = {
        container: playerContainer.value,
        video: {
          url: currentSource.value,
          type: 'customHls',
          customType: {
            customHls: function(video, player) {
              const hls = new Hls();
              hls.loadSource(video.src);
              hls.attachMedia(video);
              hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
              player.hls = hls;
            }
          }
        },
        autoplay: true
      };

      try {
        dp = new DPlayer(options);
      } catch (error) {
        console.error('DPlayer init failed:', error);
        createFallbackPlayer();
      }
    };

    const changeSource = async () => {
      if (isNativePlatform.value) {
        await initializeNativePlayer();
      } else if (dp) {
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(currentSource.value);
          hls.attachMedia(dp.video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => dp.video.play());
          if (dp.hls) dp.hls.destroy();
          dp.hls = hls;
        } else if (dp.video.canPlayType('application/vnd.apple.mpegurl')) {
          dp.video.src = currentSource.value;
        }
      }
    };

    const closePlayer = async () => {
      if (dp) {
        dp.destroy();
        dp = null;
      }
      if (isNativePlatform.value) {
        await ExoPlayer.stop();
      }
      emit('close');
    };

    // Watch for source changes
    watch([selectedEpisodeGroup, selectedQuality], changeSource);

    onMounted(initializePlayer);
    onBeforeUnmount(closePlayer);

    return {
      playerContainer,
      nativePlayerContainer,
      selectedEpisodeGroup,
      selectedQuality,
      episodeGroups,
      currentQualities,
      isNativePlatform,
      closePlayer
    };
  }
};
</script>

<style scoped>
/* Your existing styles */
.video-player-container {
  width: 100vw;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.dplayer-container, .native-player-container {
  width: 100%;
  height: 60vh;
  margin: 0 auto;
}

.quality-toggle-group, .episode-toggle-group {
  flex-wrap: wrap;
  gap: 4px;
}

@media (max-width: 768px) {
  .dplayer-container, .native-player-container {
    height: 50vh;
  }

  .quality-toggle-group .v-btn, .episode-toggle-group .v-btn {
    margin: 2px;
    min-width: 60px;
    height: 28px;
  }
}
</style>