import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.twitch.tv/helix',
});

api.defaults.headers.common['Client-id'] = 'tw7mv3ss2dedn8gz5j2fnj4venfqe9';

export { api };
