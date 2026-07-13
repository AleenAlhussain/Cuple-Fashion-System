// authentication
export const login = "/login";
export const register = "register";
export const forgotPassword = "forgot-password";
export const verifyToken = "verify-token";
export const updatePassword = "update-password";
export const LogoutAPI = "/logout";

// self data (get)
export const selfData = "/self";
export const updateProfile = "/updateProfile";
export const updateProfilePassword = "/updatePassword";
export const verifyEmailChange = "/verifyEmailChange";

//roles api
export const role = "role";

//users api
export const user = "user";
export const UserImportAPI = "user/csv/import";
export const UserExportAPI = "user/csv/export";
export const UserExportSelectedAPI = "user/export-selected";
export const UserAddressesAPI = (id) => `user/${id}/addresses`;
export const UserAddressesExportAPI = (id) => `user/${id}/addresses/export`;
export const UsersAddressesExportAPI = "users/addresses/export";
export const SubscriptionEmailAPI = "/subscription-email";
export const SubscriptionEmailExportAPI = "/subscription-email/export";

// attributes api
export const attribute = "attribute";
export const AttributeImportAPI = "attribute/csv/import";
export const AttributeExportAPI = "attribute/csv/export";

// tags api
export const tag = "/tag";
export const TagImportAPI = "tag/csv/import";
export const TagExportAPI = "tag/csv/export";

// Categories api
export const Category = "/category";
export const CategoryImportAPI = "category/csv/import";
export const CategoryExportAPI = "category/csv/export";

// store api
export const store = "/store";

// country api
export const country = "/country";

// state api
export const state = "/state";

// coupon api
export const coupon = "/coupon";

// product api
export const product = "/product";
export const Approved = '/approve'
export const ProductImportAPI = "/import/products";
export const ProductTemplateAPI = "/import/template";
export const ProductActionImportAPI = "/import/products-action";
export const ProductActionImportStartAPI = "/import/products-action/start";
export const ProductActionImportHistoryAPI = "/import/products-action/history";
export const ProductActionImportHistoryDetailAPI = (id) => `/import/products-action/history/${id}`;
export const ProductActionImportProcessAPI = (id) => `/import/products-action/history/${id}/process`;
export const ProductActionImportRollbackAPI = (id) => `/import/products-action/history/${id}/rollback`;
export const ProductExportAPI = "product/csv/export";
export const ProductExcelExportAPI = "product/excel/export";
export const ProductExportSelectedAPI = "product/export-selected";


// shipping api
export const shipping = "/shipping";
export const AramexStatusMappingsAPI = "/aramex-status-mappings";
export const AramexStatusMappingReimportAPI = "/aramex-status-mappings/reimport";
export const AramexStatusMappingUpdateAPI = (id) => `/aramex-status-mappings/${id}`;

// shippingRule api
export const shippingRule = "/shippingRule";

// setting api
export const setting = "/settings";
export const updateSetting = "/settings";

// setting api
export const checkout = "/checkout";

// attachment api
export const attachment = "/attachment";
export const createAttachment = "/attachment";
export const attachmentDelete = "/attachment/deleteAll";
export const attachmentExport = "/attachment/export";

// Commissions
export const commissions = '/commissionHistory';

// Wallet
export const UserTransactions = '/wallet/consumer';
export const WalletCredit = '/credit/wallet';
export const WalletDebit = '/debit/wallet';

// Notifications
export const NotificationsAPI = "/notifications";
export const MarkAsRead = NotificationsAPI + '/markAsRead';

// Vendor Wallet
export const VendorTransactions = '/wallet/vendor';
export const VendorWalletCredit = '/credit/vendorWallet';
export const VendorWalletDebit = '/debit/vendorWallet';

// Points
export const PointUserTransactions = '/points/consumer';
export const PointCredit = '/credit/points';
export const PointDebit = '/debit/points';

// Theme Option
export const ThemeOptions = "/themeOptions"

// Payment Details
export const PaymentAccount = '/paymentAccount';

// Pages
export const PagesAPI = '/page';

// Orders
export const OrderAPI = '/order';
export const OrderTrashedAPI = '/order/trashed';
export const OrderStatusAPI = '/orderStatus'
export const OrderPickListExportAPI = '/order/pick-list/export';
export const OrderExportXlsxAPI = '/order/export/xlsx';
export const OrderExportPdfAPI = '/order/export/pdf';

// Invoices
export const InvoiceAPI = '/invoice';

// FAQ
export const FaqAPI = '/faq'

// Home Pages
export const HomePageAPI = '/home'

// Withdrawal
export const WithdrawRequestAPI = '/withdrawRequest'

// Refund
export const RefundAPI = '/refund';
export const RefundReturnAwbAPI = (id) => `/refund/${id}/create-return-awb`;
// Exchange
export const ExchangeAPI = '/exchange';
export const ExchangeReturnAwbAPI = (id) => `/exchange/${id}/create-return-awb`;
export const ReturnSchedulePickupAPI = (id) => `/return-requests/${id}/schedule-pickup`;


// License
export const LicenseAPI = '/license-key';

// Brand
export const BrandAPI = '/brand';

// ADD TO CART
export const AddtoCartAPI = '/cart';

// Address API
export const AddressAPI = "/address"

// Badges
export const BadgeApi = '/badge'

// Badges
export const VendorSettingAPI = '/updateStoreProfile'

// Dashboard API
export const StatisticsCountAPI = '/statistics/count'
export const DashboardChartAPI = "/dashboard/chart"

// Question And Answer
export const QuestionNAnswerAPI = "/question-and-answer"

//menu
export const Menu = "/menu";


export const AppSettingsApi = "/app/settings";

export const sortMenu = '/menu/sort'

// Popups API
export const PopupAPI = '/popup';
export const PopupTypesAPI = '/popup/types';
export const PopupFrequenciesAPI = '/popup/frequencies';

// Stories API
export const StoryAPI = '/story';
export const StoryProductsAPI = '/story/products'; 

// Admin seeting new endpoint
export const adminSetting = "/api/admin/settings";

// Discount Rules API (Offer Engine)
export const DiscountRuleAPI = '/discount-rule';
export const DiscountRuleEnumsAPI = '/discount-rule/enums';
export const DiscountRuleStackingGroupsAPI = '/discount-rule/stacking-groups';
export const DiscountRuleFilterOptionsAPI = '/discount-rule/filter-options';
export const DiscountRuleExportStatisticsAPI = (id) => `/discount-rule/${id}/statistics/export`;

// Discount Reports API
export const DiscountReportsOverviewAPI = '/discount-reports/overview';
export const DiscountReportsByRuleAPI = '/discount-reports/by-rule';
export const DiscountReportsByDateAPI = '/discount-reports/by-date';
export const DiscountReportsByRuleTypeAPI = '/discount-reports/by-rule-type';
export const DiscountReportsExportAPI = '/discount-reports/export';

// Payment Gateways API (BNPL - Tabby, Tamara)
export const PaymentGatewayAPI = '/payment-gateway';
export const PaymentTransactionsAPI = '/payment-transactions';

// Promo Groups API
export const PromoGroupAPI = '/promo-group';
export const PromoGroupUploadSkusAPI = (id) => `/promo-group/${id}/upload-skus`;
export const PromoGroupRemoveSkusAPI = (id) => `/promo-group/${id}/remove-skus`;
export const PromoGroupVariantsAPI = (id) => `/promo-group/${id}/variants`;
export const PromoGroupTemplateAPI = '/promo-group/template';
export const PromoGroupVariantsByCategoryAPI = (categoryId) => `/variants-by-category/${categoryId}`;
