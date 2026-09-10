namespace AcfAfricanbank.Core.Utilities;

public static class ExtensionMethods
{
    /// <summary>
    /// Splits <paramref name="source"/> into consecutive groups of <paramref name="itemsPerGroup"/> items.
    /// </summary>
    public static IEnumerable<IGrouping<int, TSource>> GroupBy<TSource>(
        this IEnumerable<TSource> source, int itemsPerGroup)
    {
        return source.Select((item, index) => (item, index))
            .GroupBy(x => x.index / itemsPerGroup, x => x.item)
            .ToList();
    }
}
