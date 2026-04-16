export type PreviewEntityType = 'SUBPAGE' | 'POST';

export interface IssuePreviewTokenDto {
  entityType: PreviewEntityType;
  entityId: string;
}

export interface PreviewTokenResponse {
  token: string;
  webPreviewUrl: string;
  expiresAt: string;
}
