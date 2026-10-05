namespace Toliso.Backend.Api.Shared.Errors;

/// <summary>A entidade pedida nao existe. Vira 404.</summary>
public sealed class NotFoundException(string message) : Exception(message);

/// <summary>A operacao conflita com o estado atual (ex.: e-mail duplicado). Vira 409.</summary>
public sealed class ConflictException(string message) : Exception(message);

/// <summary>A requisicao e valida mas nao e permitida pra este usuario. Vira 403.</summary>
public sealed class ForbiddenException(string message) : Exception(message);

/// <summary>Os dados da requisicao nao passam nas regras de negocio. Vira 422.</summary>
public sealed class BusinessRuleException(string message) : Exception(message);

/// <summary>Uma integracao externa (Resend, Expo) falhou ou nao esta configurada. Vira 502.</summary>
public sealed class ExternalServiceException(string message) : Exception(message);
