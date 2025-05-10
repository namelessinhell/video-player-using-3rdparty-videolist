export class ExoPlayerAndroid {
    async play(options) {
      return await ExoPlayer.play(options);
    }

    async stop() {
      return await ExoPlayer.stop();
    }
  }