export type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
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
  RecommendedItem,
  RecommendedConfig,
  ShortcutItem,
  ShortcutConfig,
  LatestPostsConfig,
  CtaConfig,
  NoticeItem,
  NoticeConfig,
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
