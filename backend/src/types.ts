export type User = { id: number; username: string; password: string };

export type Playlist = {
  id: number;
  name: string;
  videoLimit: number;
  doesOwnerVoteCount: number;
  userId: number;
};

export type VideoMinusPlaylistId = {
  id: number;
  link: string;
  userId: number;
  username: string;
};
