using FluentValidation;

namespace Toliso.Backend.Api.Reports.SendExpenseReport;

public class SendExpenseReportRequestValidator : AbstractValidator<SendExpenseReportRequest>
{
    public SendExpenseReportRequestValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
    }
}
