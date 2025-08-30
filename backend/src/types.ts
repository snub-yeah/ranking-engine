export type User = { id: number; username: string; password: string };

export type Playlist = {
  id: number;
  name: string;
  videoLimit: number;
  doesOwnerVoteCount: number;
  userId: number;
};
