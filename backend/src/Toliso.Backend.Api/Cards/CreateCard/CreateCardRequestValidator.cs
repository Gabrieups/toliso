using FluentValidation;

namespace Toliso.Backend.Api.Cards.CreateCard;

public class CreateCardRequestValidator : AbstractValidator<CreateCardRequest>
{
    public CreateCardRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty();
        RuleFor(x => x.Bank).NotEmpty();
        RuleFor(x => x.Color).NotEmpty();
        RuleFor(x => x.DueDay).InclusiveBetween((short)1, (short)31);
        RuleFor(x => x.ClosingDay).InclusiveBetween((short)1, (short)31);
    }
}
