package kz.kindergarten.common;

public class ApiException extends RuntimeException {
    private final int status;
    private final String code;
    private final Object extra;
    public ApiException(int status, String code, String message) {
        this(status, code, message, null);
    }
    public ApiException(int status, String code, String message, Object extra) {
        super(message);
        this.status = status;
        this.code = code;
        this.extra = extra;
    }
    public int getStatus() { return status; }
    public String getCode() { return code; }
    public Object getExtra() { return extra; }
    public static ApiException missing() {
        return new ApiException(404, "NOT_FOUND", "Запись не найдена");
    }

    public static ApiException conflict() {
        return new ApiException(409, "VERSION_CONFLICT", "Данные изменились. Обновите страницу");
    }

    public static ApiException rule(String message) {
        return new ApiException(422, "BUSINESS_RULE", message);
    }
}
