import { supabase } from '@/shared/database/supabaseClient';
import { SupabaseArenaRepository } from '../repositories/SupabaseArenaRepository';
import type { CreateArenaDTO, UpdateArenaDTO } from '../types/arena.types';

// Re-export for backwards compatibility with existing imports
export type { Arena, CreateArenaDTO as ArenaInput, UpdateArenaDTO } from '../types/arena.types';

const repo = new SupabaseArenaRepository(supabase);

export class ArenaService {
  static getArenasByOwner(ownerId: string) {
    return repo.findByOwnerId(ownerId);
  }

  static getArenaById(id: string) {
    return repo.findById(id);
  }

  static createArena(input: CreateArenaDTO) {
    return repo.create(input);
  }

  static updateArena(id: string, input: UpdateArenaDTO) {
    return repo.update(id, input);
  }

  static deleteArena(id: string) {
    return repo.delete(id);
  }

  static async uploadBanner(file: File, arenaId: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('arenaId', arenaId);
    formData.append('type', 'banner');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    const data = await response.json();
    return data.url;
  }

  static async getFirstArenaByOrganizationUser(userId: string) {
    const arenas = await repo.findByOwnerId(userId);
    return arenas[0] ?? null;
  }
}
