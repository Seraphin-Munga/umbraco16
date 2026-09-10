namespace Web.Portal
{
    public class CmsConstants
    {

        public class Products
        {
            public const string TxFree = "TxFree";
            public const string Fixed = "Fixed";
            public const string Access = "Access";
            public const string Notice = "Notice";
        }

        public class Banner
        {
            public class Overlay
            {
                public const int ContentTextMaxLengthWithoutButton = 200;
                public const int ContentTextMaxLengthWithButton = 123;
                public const int SliderContentTextMaxLengthWithoutButton = 200;
                public const int SliderContentTextMaxLengthWithButton = 95;
                public const int ButtonText = 11;
            }
        }

        public class Grid
        {
            public const int MaxColSize = 12;
            public const int DefaultColSize = 3;
            public const string DefaultContentAlignment = "text-left";
        }
    }
}