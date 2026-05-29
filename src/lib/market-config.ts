export const marketConfig = {
  siteId: process.env.MELI_SITE || "MLB",
  marketplaceName: "Mercado Livre Brasil",
  countryName: "Brazil",
  countryNameLocal: "Brasil",
  localCurrency: "BRL",
  localCurrencySymbol: "R$",
  timezone: "America/Sao_Paulo",
  exchangeRateSettingKey: "exchange_rate_brl_to_cny",
  exchangeRateLabel: "BRL → CNY 汇率",
  legacyExchangeRateSettingKey: "exchange_rate_mxn_to_cny",
} as const;

export const {
  siteId,
  marketplaceName,
  countryName,
  countryNameLocal,
  localCurrency,
  localCurrencySymbol,
  timezone,
  exchangeRateSettingKey,
  exchangeRateLabel,
  legacyExchangeRateSettingKey,
} = marketConfig;
