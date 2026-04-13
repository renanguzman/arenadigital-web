import type { Arena, CreateArenaDTO, UpdateArenaDTO } from '../types/arena.types';

export interface IArenaRepository {
  /** Returns all arenas the user owns or is linked to via arena_users. */
  findByOwnerId(ownerId: string): Promise<Arena[]>;
  findById(id: string): Promise<Arena | null>;
  create(data: CreateArenaDTO): Promise<Arena>;
  update(id: string, data: UpdateArenaDTO): Promise<Arena>;
  delete(id: string): Promise<void>;
}
