"use client";

import { useSettings } from "./settings-store";

/**
 * Простая система переводов интерфейса.
 * Базовый словарь — русский; для остальных языков недостающие
 * ключи автоматически берутся из русского.
 */

const ru = {
  // Навигация
  navContacts: "Контакты",
  navCalls: "Звонки",
  navChats: "Чаты",
  navSettings: "Настройки",
  online: "в сети",
  // Настройки — главный экран
  inviteFriends: "Пригласить друзей",
  notifications: "Уведомления и звук",
  security: "Безопасность",
  devices: "Устройства",
  messages: "Сообщения",
  appearance: "Оформление",
  favorites: "Избранное",
  folders: "Папки",
  language: "Язык",
  dataStorage: "Данные и память",
  about: "О приложении",
  administration: "Администрирование",
  adminPanel: "Админ-панель",
  adminManage: "Управление",
  adminHint: "Просмотр всех пользователей, поиск и блокировка нарушителей.",
  account: "Аккаунт",
  signOut: "Выйти из аккаунта",
  signingOut: "Выходим…",
  signedInAs: "Вы вошли как",
  syncHint: "Данные синхронизируются между вашими устройствами.",
  setUsername: "задать имя пользователя",
  // Темы
  themeSystem: "Как в системе",
  themeLight: "Светлая",
  themeDark: "Тёмная",
  // Язык
  interfaceLanguage: "Язык интерфейса",
  languageHint: "Выбранный язык сохраняется на всех ваших устройствах.",
  // Безопасность
  access: "Доступ",
  passcode: "Код-пароль",
  twoFactor: "Двухэтапная проверка",
  twoFactorHint:
    "Двухэтапная проверка добавляет пароль при входе с нового устройства.",
  privacySection: "Приватность",
  whoSeesMyStatus: "Кто видит мой статус",
  readReceipts: "Отчёты о прочтении",
  readReceiptsHint:
    "Если выключено, вы не будете видеть отчёты о прочтении других пользователей, а они — ваши.",
  blockedUsers: "Заблокированные",
  lastSeenEveryone: "Все",
  lastSeenContacts: "Мои контакты",
  lastSeenNobody: "Никто",
  passcodeOn: "Код-пароль включён",
  passcodeOff: "Код-пароль выключен",
  twoFaOn: "2FA включена",
  twoFaOff: "2FA выключена",
  // Заблокированные
  unblock: "Разблокировать",
  noBlocked: "Нет заблокированных пользователей",
  blockedHint:
    "Заблокированные пользователи не могут писать вам и видеть ваш профиль.",
};

export type TKey = keyof typeof ru;

const en: Record<TKey, string> = {
  navContacts: "Contacts",
  navCalls: "Calls",
  navChats: "Chats",
  navSettings: "Settings",
  online: "online",
  inviteFriends: "Invite Friends",
  notifications: "Notifications and Sounds",
  security: "Security",
  devices: "Devices",
  messages: "Messages",
  appearance: "Appearance",
  favorites: "Saved Messages",
  folders: "Folders",
  language: "Language",
  dataStorage: "Data and Storage",
  about: "About",
  administration: "Administration",
  adminPanel: "Admin Panel",
  adminManage: "Manage",
  adminHint: "View all users, search and block violators.",
  account: "Account",
  signOut: "Sign Out",
  signingOut: "Signing out…",
  signedInAs: "Signed in as",
  syncHint: "Your data syncs across all your devices.",
  setUsername: "set a username",
  themeSystem: "System",
  themeLight: "Light",
  themeDark: "Dark",
  interfaceLanguage: "Interface Language",
  languageHint: "Your language choice is synced across all your devices.",
  access: "Access",
  passcode: "Passcode",
  twoFactor: "Two-Step Verification",
  twoFactorHint:
    "Two-step verification adds a password when signing in on a new device.",
  privacySection: "Privacy",
  whoSeesMyStatus: "Who can see my status",
  readReceipts: "Read Receipts",
  readReceiptsHint:
    "If disabled, you won't see other people's read receipts, and they won't see yours.",
  blockedUsers: "Blocked Users",
  lastSeenEveryone: "Everybody",
  lastSeenContacts: "My Contacts",
  lastSeenNobody: "Nobody",
  passcodeOn: "Passcode enabled",
  passcodeOff: "Passcode disabled",
  twoFaOn: "2FA enabled",
  twoFaOff: "2FA disabled",
  unblock: "Unblock",
  noBlocked: "No blocked users",
  blockedHint: "Blocked users can't message you or see your profile.",
};

const uk: Record<TKey, string> = {
  navContacts: "Контакти",
  navCalls: "Дзвінки",
  navChats: "Чати",
  navSettings: "Налаштування",
  online: "в мережі",
  inviteFriends: "Запросити друзів",
  notifications: "Сповіщення і звук",
  security: "Безпека",
  devices: "Пристрої",
  messages: "Повідомлення",
  appearance: "Оформлення",
  favorites: "Вибране",
  folders: "Папки",
  language: "Мова",
  dataStorage: "Дані і пам'ять",
  about: "Про застосунок",
  administration: "Адміністрування",
  adminPanel: "Адмін-панель",
  adminManage: "Керування",
  adminHint: "Перегляд усіх користувачів, пошук і блокування порушників.",
  account: "Обліковий запис",
  signOut: "Вийти з облікового запису",
  signingOut: "Виходимо…",
  signedInAs: "Ви увійшли як",
  syncHint: "Дані синхронізуються між вашими пристроями.",
  setUsername: "задати ім'я користувача",
  themeSystem: "Як у системі",
  themeLight: "Світла",
  themeDark: "Темна",
  interfaceLanguage: "Мова інтерфейсу",
  languageHint: "Обрана мова зберігається на всіх ваших пристроях.",
  access: "Доступ",
  passcode: "Код-пароль",
  twoFactor: "Двоетапна перевірка",
  twoFactorHint:
    "Двоетапна перевірка додає пароль під час входу з нового пристрою.",
  privacySection: "Приватність",
  whoSeesMyStatus: "Хто бачить мій статус",
  readReceipts: "Звіти про прочитання",
  readReceiptsHint:
    "Якщо вимкнено, ви не бачитимете звіти про прочитання інших користувачів, а вони — ваші.",
  blockedUsers: "Заблоковані",
  lastSeenEveryone: "Усі",
  lastSeenContacts: "Мої контакти",
  lastSeenNobody: "Ніхто",
  passcodeOn: "Код-пароль увімкнено",
  passcodeOff: "Код-пароль вимкнено",
  twoFaOn: "2FA увімкнено",
  twoFaOff: "2FA вимкнено",
  unblock: "Розблокувати",
  noBlocked: "Немає заблокованих користувачів",
  blockedHint:
    "Заблоковані користувачі не можуть писати вам і бачити ваш профіль.",
};

const kk: Record<TKey, string> = {
  navContacts: "Контактілер",
  navCalls: "Қоңыраулар",
  navChats: "Чаттар",
  navSettings: "Баптаулар",
  online: "желіде",
  inviteFriends: "Достарды шақыру",
  notifications: "Хабарландырулар мен дыбыс",
  security: "Қауіпсіздік",
  devices: "Құрылғылар",
  messages: "Хабарламалар",
  appearance: "Безендіру",
  favorites: "Таңдаулылар",
  folders: "Қалталар",
  language: "Тіл",
  dataStorage: "Деректер және жад",
  about: "Қолданба туралы",
  administration: "Әкімшілік",
  adminPanel: "Әкімші панелі",
  adminManage: "Басқару",
  adminHint: "Барлық пайдаланушыларды қарау, іздеу және бұзушыларды бұғаттау.",
  account: "Аккаунт",
  signOut: "Аккаунттан шығу",
  signingOut: "Шығудамыз…",
  signedInAs: "Сіз кірдіңіз:",
  syncHint: "Деректер құрылғыларыңыз арасында синхрондалады.",
  setUsername: "пайдаланушы атын орнату",
  themeSystem: "Жүйедегідей",
  themeLight: "Ашық",
  themeDark: "Қараңғы",
  interfaceLanguage: "Интерфейс тілі",
  languageHint: "Таңдалған тіл барлық құрылғыларыңызда сақталады.",
  access: "Қолжетімділік",
  passcode: "Код-құпиясөз",
  twoFactor: "Екі қадамдық тексеру",
  twoFactorHint:
    "Екі қадамдық тексеру жаңа құрылғыдан кіргенде құпиясөз қосады.",
  privacySection: "Құпиялылық",
  whoSeesMyStatus: "Менің статусымды кім көреді",
  readReceipts: "Оқылғаны туралы есептер",
  readReceiptsHint:
    "Өшірілген болса, сіз басқалардың оқу белгілерін көрмейсіз, олар да сіздікін көрмейді.",
  blockedUsers: "Бұғатталғандар",
  lastSeenEveryone: "Барлығы",
  lastSeenContacts: "Менің контактілерім",
  lastSeenNobody: "Ешкім",
  passcodeOn: "Код-құпиясөз қосылды",
  passcodeOff: "Код-құпиясөз өшірілді",
  twoFaOn: "2FA қосылды",
  twoFaOff: "2FA өшірілді",
  unblock: "Бұғаттан шығару",
  noBlocked: "Бұғатталған пайдаланушылар жоқ",
  blockedHint:
    "Бұғатталған пайдаланушылар сізге жаза алмайды және профиліңізді көре алмайды.",
};

const dicts = { ru, en, uk, kk } as const;

/** Хук перевода: const t = useT(); t("navChats") */
export function useT() {
  const { language } = useSettings();
  const dict = dicts[language] ?? ru;
  return (key: TKey): string => dict[key] ?? ru[key];
}
