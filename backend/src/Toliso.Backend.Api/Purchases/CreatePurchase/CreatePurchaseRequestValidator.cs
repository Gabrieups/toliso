using FluentValidation;
using Toliso.Backend.Api.Data.Entities;

namespace Toliso.Backend.Api.Purchases.CreatePurchase;

public class CreatePurchaseRequestValidator : AbstractValidator<CreatePurchaseRequest>
{
    public CreatePurchaseRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.CardId).NotEmpty();
        RuleFor(x => x.Installments).InclusiveBetween((short)1, (short)60);

        RuleFor(x => x)
            .Must(x => x.Installments <= 1 || !x.IsRecurring)
            .WithMessage("Uma compra não pode ser parcelada e recorrente ao mesmo tempo.");

        When(x => x.IsShared && x.DivisionType == PurchaseDivisionType.Custom, () =>
        {
            RuleFor(x => x.CustomShares).NotEmpty().WithMessage("Informe as partes customizadas.");
        });

        When(x => x.IsShared && x.DivisionType == PurchaseDivisionType.Equal, () =>
        {
            RuleFor(x => x.SharedUserIds).NotEmpty().WithMessage("Informe com quem a despesa é dividida.");
        });
    }
}
