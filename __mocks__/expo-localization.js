module.exports = {
  getLocales: () => [
    { countryCode: 'VN', languageTag: 'vi-VN', languageCode: 'vi', isRTL: false },
  ],
  getCalendars: () => [{ calendar: 'gregorian', timeZone: 'Asia/Ho_Chi_Minh' }],
  getTimeZone: () => 'Asia/Ho_Chi_Minh',
  getRegion: () => 'VN',
  getCurrency: () => 'VND',
  getTemperatureUnit: () => 'celsius',
  uses24HourClock: () => true,
  usesMetricSystem: () => true,
  isRTL: false,
  locale: 'vi-VN',
};
