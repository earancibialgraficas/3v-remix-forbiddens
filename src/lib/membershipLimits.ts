// src/lib/membershipLimits.ts

export type MembershipTier = 'novato' | 'entusiasta' | 'coleccionista' | 'miembro del legado' | 'leyenda arcade' | 'creador de contenido';

export interface MembershipLimits {
  maxAvatars: number;
  canUploadAvatar: boolean;
  maxForumChars: number;
  maxPhotos: number;
  maxSocialContent: number;
  maxFriends: number;
  storageMB: number;
}

export const MEMBERSHIP_LIMITS: Record<MembershipTier | 'staff', MembershipLimits> = {
  novato: {
    maxAvatars: 25,
    canUploadAvatar: false,
    maxForumChars: 500,
    maxPhotos: 15,
    maxSocialContent: 15,
    maxFriends: 25,
    storageMB: 50
  },
  entusiasta: {
    maxAvatars: 55,
    canUploadAvatar: true, // Actualizado según tu petición
    maxForumChars: 1000,
    maxPhotos: 30,
    maxSocialContent: 30,
    maxFriends: 50,
    storageMB: 150
  },
  coleccionista: {
    maxAvatars: 60,
    canUploadAvatar: true,
    maxForumChars: 1500,
    maxPhotos: 50,
    maxSocialContent: 50,
    maxFriends: 100,
    storageMB: 500
  },
  'miembro del legado': {
    maxAvatars: 999, // Desbloqueado
    canUploadAvatar: true,
    maxForumChars: 2000,
    maxPhotos: 90,
    maxSocialContent: 90,
    maxFriends: 200,
    storageMB: 1000
  },
  'leyenda arcade': {
    maxAvatars: 999, // Desbloqueado
    canUploadAvatar: true,
    maxForumChars: 3000,
    maxPhotos: 100,
    maxSocialContent: 100,
    maxFriends: 500,
    storageMB: 3000
  },
  'creador de contenido': {
    maxAvatars: 999, // Desbloqueado
    canUploadAvatar: true,
    maxForumChars: 5000,
    maxPhotos: 999, // Ilimitado
    maxSocialContent: 999, // Ilimitado
    maxFriends: 999, // Ilimitado
    storageMB: 5000
  },
  staff: {
    maxAvatars: 999,
    canUploadAvatar: true,
    maxForumChars: 10000,
    maxPhotos: 999,
    maxSocialContent: 999,
    maxFriends: 999,
    storageMB: 10000
  }
};