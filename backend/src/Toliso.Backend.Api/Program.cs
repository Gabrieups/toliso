using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Scalar.AspNetCore;
using Toliso.Backend.Api.Auth.Login;
using Toliso.Backend.Api.Auth.Me;
using Toliso.Backend.Api.Cards.CreateCard;
using Toliso.Backend.Api.Cards.DeleteCard;
using Toliso.Backend.Api.Cards.ListCards;
using Toliso.Backend.Api.Cards.UpdateCard;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Entries.CreateEntry;
using Toliso.Backend.Api.Entries.DeleteEntry;
using Toliso.Backend.Api.Entries.ListEntries;
using Toliso.Backend.Api.Invoices.GetInvoices;
using Toliso.Backend.Api.Push.RegisterPushToken;
using Toliso.Backend.Api.Push.UnregisterPushToken;
using Toliso.Backend.Api.Purchases.CreatePurchase;
using Toliso.Backend.Api.Purchases.DeletePurchase;
using Toliso.Backend.Api.Purchases.ListPurchases;
using Toliso.Backend.Api.Purchases.UpdatePurchase;
using Toliso.Backend.Api.Reminders.RunInvoiceReminders;
using Toliso.Backend.Api.Reports.SendExpenseReport;
using Toliso.Backend.Api.Shared.Auth;
using Toliso.Backend.Api.Shared.Errors;
using Toliso.Backend.Api.Shared.Notifications;
using Toliso.Backend.Api.Summary.GetSummary;
using Toliso.Backend.Api.Users.CreateUser;
using Toliso.Backend.Api.Users.DeleteUser;
using Toliso.Backend.Api.Users.ListActiveUsers;
using Toliso.Backend.Api.Users.ListUsers;
using Toliso.Backend.Api.Users.UpdateUser;

var builder = WebApplication.CreateBuilder(args);

// --- Banco de dados (Supabase Postgres) ------------------------------------
// A connection string e lida de dentro do delegate (via IConfiguration do
// service provider), nao capturada numa variavel antes do Build() — assim o
// WebApplicationFactory dos testes de integracao consegue sobrepor a
// configuracao (ex.: apontar pro Postgres do Testcontainers).
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
{
    var connectionString = sp.GetRequiredService<IConfiguration>().GetConnectionString("Default")
        ?? throw new InvalidOperationException("ConnectionStrings:Default nao configurada.");
    options.UseNpgsql(connectionString);
});

// --- Autenticacao / Autorizacao --------------------------------------------
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<Microsoft.Extensions.Options.IOptions<JwtOptions>>((bearerOptions, jwtOptions) =>
    {
        var jwt = jwtOptions.Value;

        // Sem isso, o handler remapeia "sub"/"role" pras URIs longas do XML
        // schema na leitura (comportamento padrao do JwtSecurityTokenHandler),
        // e os claims literais emitidos em JwtTokenService deixam de bater
        // com o que o resto do codigo procura (FindFirstValue/IsInRole).
        bearerOptions.MapInboundClaims = false;
        bearerOptions.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            RoleClaimType = "role",
            NameClaimType = System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub,
        };
    });

builder.Services.AddScoped<IAuthorizationHandler, ActiveUserHandler>();
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("ActiveUser", policy => policy
        .RequireAuthenticatedUser()
        .AddRequirements(new ActiveUserRequirement()));

    options.AddPolicy("AdminOnly", policy => policy
        .RequireAuthenticatedUser()
        .AddRequirements(new ActiveUserRequirement())
        .RequireRole("Admin"));
});

builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

// --- Notificacoes (Expo push + Resend e-mail) ------------------------------
builder.Services.Configure<ExpoOptions>(builder.Configuration.GetSection(ExpoOptions.SectionName));
builder.Services.Configure<ResendOptions>(builder.Configuration.GetSection(ResendOptions.SectionName));
builder.Services.AddHttpClient<IPushSender, ExpoPushSender>();
builder.Services.AddHttpClient<IReportEmailSender, ResendEmailSender>();

// --- Validacao ---------------------------------------------------------
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// --- Erros / OpenAPI -----------------------------------------------------
builder.Services.AddExceptionHandler<ErrorHandlerMiddleware>();
builder.Services.AddProblemDetails();

const string BearerSecuritySchemeId = "Bearer";
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, _, _) =>
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes[BearerSecuritySchemeId] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
        };
        document.SecurityRequirements.Add(new OpenApiSecurityRequirement
        {
            [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = BearerSecuritySchemeId } }] = [],
        });
        return Task.CompletedTask;
    });
});

var app = builder.Build();

app.UseExceptionHandler(_ => { });

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

app.MapLoginEndpoint();
app.MapMeEndpoint();

app.MapListUsersEndpoint();
app.MapListActiveUsersEndpoint();
app.MapCreateUserEndpoint();
app.MapUpdateUserEndpoint();
app.MapDeleteUserEndpoint();

app.MapListCardsEndpoint();
app.MapCreateCardEndpoint();
app.MapUpdateCardEndpoint();
app.MapDeleteCardEndpoint();

app.MapCreatePurchaseEndpoint();
app.MapUpdatePurchaseEndpoint();
app.MapDeletePurchaseEndpoint();
app.MapListPurchasesEndpoint();

app.MapCreateEntryEndpoint();
app.MapDeleteEntryEndpoint();
app.MapListEntriesEndpoint();

app.MapGetInvoicesEndpoint();

app.MapRegisterPushTokenEndpoint();
app.MapUnregisterPushTokenEndpoint();

app.MapSendExpenseReportEndpoint();

app.MapRunInvoiceRemindersEndpoint();

app.MapGetSummaryEndpoint();

app.Run();

/// <summary>Classe parcial so pra servir de ancora de assembly (validators, WebApplicationFactory nos testes).</summary>
public partial class Program;
