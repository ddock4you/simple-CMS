export type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  ListSnapshot,
} from './common.types';

export type {
  ResourceKey,
  Action,
  ResourceAction,
  PermissionMap,
} from './domain/permission.types';
export { RESOURCE_ACTIONS } from './domain/permission.types';

export type {
  HomeSectionType,
  HomeSectionButton,
  SlideOptions,
  HeroSlide,
  HeroConfig,
  BriefIntroConfig,
  RecommendedItem,
  RecommendedConfig,
  SubCarouselItem,
  SubCarouselConfig,
  FrequentMenuItemType,
  FrequentMenuItem,
  FrequentMenuConfig,
  ShortcutItem,
  ShortcutConfig,
  LatestPostsConfig,
  CtaConfig,
  LegacyNoticeItem,
  NoticeConfig,
  GalleryCollectionConfig,
  HomeSectionConfig,
} from './domain/home.types';

export type {
  HomeSectionListItem,
  HomeSectionDetail,
  UpdateHomeSectionDto,
  ReorderHomeSectionsDto,
  HomeReferencesDto,
} from './dto/home.dto';

export type { HomePopupType, PopupLinkKind } from './domain/popup.types';

export type {
  HomePopupListItem,
  HomePopupDetail,
  CreateHomePopupDto,
  UpdateHomePopupDto,
  ReorderHomePopupsDto,
  HomePopupReferencesDto,
} from './dto/popup.dto';

export type {
  PageBlockType,
  RichTextBlockConfig,
  HtmlBlockConfig,
  ImageBlockConfig,
  IframeBlockConfig,
  PageBlockConfig,
} from './domain/block.types';
export {
  PAGE_BLOCK_MAX_PER_SUBPAGE,
  IFRAME_ALLOWED_HOSTS,
  isIframeHostAllowed,
} from './domain/block.types';

export type {
  PageBlockListItem,
  PageBlockDetail,
  CreatePageBlockDto,
  UpdatePageBlockDto,
  ReorderPageBlocksDto,
} from './dto/block.dto';

export type {
  MediaListItem,
  MediaDetail,
  MediaListFilters,
  MediaListResponse,
  UpdateMediaDto,
  UploadMediaResponse,
  MediaReferenceType,
  MediaReference,
  MediaReferencesResponse,
  BulkDeleteMediaResponse,
} from './dto/media.dto';

export type {
  PreviewEntityType,
  IssuePreviewTokenDto,
  PreviewTokenResponse,
} from './dto/preview.dto';

export type {
  FeedbackRating,
  FeedbackPositiveReason,
} from './domain/feedback.types';
export {
  FEEDBACK_POSITIVE_REASONS,
  FEEDBACK_POSITIVE_REASON_CODES,
  FEEDBACK_RATING_LABELS,
  FEEDBACK_COMMENT_MAX_LENGTH,
  FEEDBACK_RATE_LIMIT_HOURS,
  FEEDBACK_RETENTION_DAYS,
} from './domain/feedback.types';

export type {
  CreateFeedbackDto,
  FeedbackListItem,
  FeedbackListFilters,
  FeedbackListResponse,
  FeedbackOverallStats,
  FeedbackDailyPoint,
  FeedbackBySubpageItem,
  FeedbackPositiveReasonStat,
  FeedbackStatsResponse,
} from './dto/feedback.dto';

export type { SiteSettingKey } from './domain/siteSettings.types';
export { SITE_SETTING_KEYS } from './domain/siteSettings.types';
export type {
  SiteFooterBottomLink,
  SiteFooterConfig,
  SiteFooterContact,
  SiteFooterQuickLink,
  SiteFooterSocialLink,
  SiteFooterSocialPlatform,
} from './domain/footer.types';
export {
  DEFAULT_SITE_FOOTER_CONFIG,
  DEFAULT_SITE_FOOTER_IDENTIFIER_TEXT,
} from './domain/footer.types';

export type {
  CclType,
  SubpageCclInfo,
  SubpageContentStatus,
  SubpageVersionSource,
  SubpageVersionStatusStrategy,
} from './domain/subpage.types';
export {
  CCL_TYPE_LABELS,
  CCL_TYPE_ASSET,
  CCL_AI_ASSET,
  SUBPAGE_VERSION_SOURCE_LABELS,
} from './domain/subpage.types';

export type {
  SubpageVersionSnapshotMeta,
  SubpageVersionSnapshotBlock,
  SubpageVersionSnapshot,
  SubpageVersionAuthor,
  SubpageVersionListItem,
  SubpageVersionDetail,
  SubpageVersionListResponse,
  SubpageVersionListFilters,
  CreateSubpageVersionDto,
  RollbackSubpageVersionDto,
  UpdateSubpageVersionDto,
} from './dto/subpage-version.dto';
export {
  SUBPAGE_VERSION_RETENTION_LIMIT,
  SUBPAGE_VERSION_LABEL_MAX_LENGTH,
  SUBPAGE_VERSION_SUBJECT_DISPLAY_LIMIT,
} from './dto/subpage-version.dto';
