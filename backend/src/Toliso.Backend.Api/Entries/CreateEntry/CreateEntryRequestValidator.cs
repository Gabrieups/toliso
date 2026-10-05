using FluentValidation;

namespace Toliso.Backend.Api.Entries.CreateEntry;

public class CreateEntryRequestValidator : AbstractValidator<CreateEntryRequest>
{
    public CreateEntryRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
    }
}
