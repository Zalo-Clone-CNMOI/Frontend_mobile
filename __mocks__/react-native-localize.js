// Manual mock for react-native-localize (a node_modules package), wired to the
// real module name via jest.config.js `moduleNameMapper` (the jest-expo resolver
// bypasses the root __mocks__ auto-apply, so the explicit mapping is required).
// The real package calls TurboModuleRegistry.getEnforcing('RNLocalize'), which
// throws in the jest environment because there is no native binary.
// src/i18n/config.ts invokes findBestLanguageTag() at module-load time, so
// without this mock any test that (transitively) imports the i18n singleton
// crashes at import.
//
// We return a deterministic Vietnamese locale so i18n initializes to 'vi',
// keeping the existing VI-string assertions stable.
module.exports = {
  findBestLanguageTag: () => ({ languageTag: 'vi-VN', isRTL: false }),
  getLocales: () => [
    { countryCode: 'VN', languageTag: 'vi-VN', languageCode: 'vi', isRTL: false },
  ],
  getNumberFormatSettings: () => ({ decimalSeparator: '.', groupingSeparator: ',' }),
  getCalendar: () => 'gregorian',
  getCountry: () => 'VN',
  getCurrencies: () => ['VND'],
  getTemperatureUnit: () => 'celsius',
  getTimeZone: () => 'Asia/Ho_Chi_Minh',
  uses24HourClock: () => true,
  usesMetricSystem: () => true,
  usesAutoDateAndTime: () => true,
  usesAutoTimeZone: () => true,
};
