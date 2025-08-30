<script>
	const convertYoutubeUrlToThumbnailUrl = (url) => {
		let videoId;
		if (url.startsWith('https://www.youtube.com/watch?v=')) {
			videoId = url.split('v=')[1];
			videoId = videoId.split('&')[0];
		} else if (url.startsWith('https://youtu.be/')) {
			videoId = url.split('youtu.be/')[1];
			videoId = videoId.split('?')[0];
		}
		return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
	};
</script>
