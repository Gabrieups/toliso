using FluentValidation;

namespace Toliso.Backend.Api.Purchases.UpdatePurchase;

public class UpdatePurchaseRequestValidator : AbstractValidator<UpdatePurchaseRequest>
{
    public UpdatePurchaseRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.CardId).NotEmpty();
    }
}
