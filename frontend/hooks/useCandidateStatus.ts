// hooks/useCandidateStatus.ts

import {
  STATUS_COLORS,
  STATUS_LABEL,
} from '../features/candidates/types/candidate.types';

export const normalizeStatus = (status: string) => {
  return status.trim().replace(/\s+/g, '_');
};

export const useCandidateStatus = (status: string) => {
  const normalizedStatus = normalizeStatus(status);

  return {
    normalizedStatus,
    colors:
      STATUS_COLORS[
        normalizedStatus as keyof typeof STATUS_COLORS
      ],
    label:
      STATUS_LABEL[
        normalizedStatus as keyof typeof STATUS_LABEL
      ] || status,
  };
};