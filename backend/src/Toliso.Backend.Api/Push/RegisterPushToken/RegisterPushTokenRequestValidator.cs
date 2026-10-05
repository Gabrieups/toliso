using FluentValidation;

namespace Toliso.Backend.Api.Push.RegisterPushToken;

public class RegisterPushTokenRequestValidator : AbstractValidator<RegisterPushTokenRequest>
{
    public RegisterPushTokenRequestValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
    }
}
