package kz.kindergarten.common;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class Problems {
    @ExceptionHandler(ApiException.class)
    ResponseEntity<ProblemDetail> api(ApiException exception) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.valueOf(exception.getStatus()), exception.getMessage());
        problem.setProperty("code", exception.getCode());
        if (exception.getExtra() != null) {
            problem.setProperty("conflictDates", exception.getExtra());
        }
        return ResponseEntity.status(exception.getStatus()).contentType(MediaType.APPLICATION_PROBLEM_JSON).body(problem);
    }

    @ExceptionHandler({DataIntegrityViolationException.class, CannotAcquireLockException.class,
            org.springframework.orm.ObjectOptimisticLockingFailureException.class})
    ResponseEntity<ProblemDetail> integrity(Exception exception) {
        return api(new ApiException(409, "DATA_CONFLICT", "Конфликт уникальности, периода или версии данных"));
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ProblemDetail> denied(Exception exception) {
        return api(new ApiException(403, "FORBIDDEN", "Доступ запрещён"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ProblemDetail> validation(MethodArgumentNotValidException exception) {
        var fields = new java.util.LinkedHashMap<String, String>();
        exception.getBindingResult().getFieldErrors().forEach(error -> fields.put(error.getField(), error.getDefaultMessage()));
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Проверьте поля запроса");
        problem.setProperty("code", "VALIDATION");
        problem.setProperty("fieldErrors", fields);
        return ResponseEntity.badRequest().contentType(MediaType.APPLICATION_PROBLEM_JSON).body(problem);
    }

    @ExceptionHandler({IllegalArgumentException.class, HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
            org.springframework.web.bind.MissingServletRequestParameterException.class,
            org.springframework.data.mapping.PropertyReferenceException.class, java.time.DateTimeException.class})
    ResponseEntity<ProblemDetail> invalid(Exception exception) {
        return api(new ApiException(400, "VALIDATION", "Некорректный запрос: проверьте значения и формат полей"));
    }
}
