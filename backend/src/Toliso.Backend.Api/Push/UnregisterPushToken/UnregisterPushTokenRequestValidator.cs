using FluentValidation;

namespace Toliso.Backend.Api.Push.UnregisterPushToken;

public class UnregisterPushTokenRequestValidator : AbstractValidator<UnregisterPushTokenRequest>
{
    public UnregisterPushTokenRequestValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
    }
}
