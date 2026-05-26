export const formatAssetPrice = (id: string, price: number | undefined | null): string => {
  if (price === undefined || price === null || isNaN(price)) return 'N/A';
  
  const idUpper = id.toUpperCase();
  if (['NASDAQ', 'SPX', 'NYSE', 'BCOM'].includes(idUpper)) {
    return `${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pts`;
  }
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
