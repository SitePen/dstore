interface Filter{
interface Collection{
filter(filter: Filter): Collection;
sort(property: string, [descending]);
