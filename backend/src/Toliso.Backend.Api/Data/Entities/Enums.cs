namespace Toliso.Backend.Api.Data.Entities;

public enum UserRole
{
    Admin,
    User,
}

public enum EntityStatus
{
    Active,
    Inactive,
}

public enum CardBrand
{
    Visa,
    Mastercard,
    Elo,
    AmericanExpress,
}

public enum PurchaseDivisionType
{
    Equal,
    Custom,
}

public enum PurchaseKind
{
    Single,
    Installment,
    Recurring,
}

public enum PushPlatform
{
    Android,
    Ios,
    Web,
}
