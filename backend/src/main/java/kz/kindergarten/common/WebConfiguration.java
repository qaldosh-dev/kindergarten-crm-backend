package kz.kindergarten.common;

import jakarta.servlet.http.*;
import java.util.Set;
import org.springframework.context.annotation.*;
import org.springframework.data.domain.*;
import org.springframework.data.web.config.PageableHandlerMethodArgumentResolverCustomizer;
import org.springframework.web.servlet.*;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class WebConfiguration implements WebMvcConfigurer {
    private static final Set<String> SORT_FIELDS = Set.of("id", "name", "fullName", "login", "month", "paidOn", "occurredAt",
            "amount", "validFrom", "dateFrom", "ageFrom", "status", "active", "version");

    @Bean
    PageableHandlerMethodArgumentResolverCustomizer pagination() {
        return resolver -> {
            resolver.setMaxPageSize(200);
            resolver.setFallbackPageable(PageRequest.of(0, 20, Sort.by("id")));
        };
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                String[] sorts = request.getParameterValues("sort");
                if (sorts != null) {
                    for (String sort : sorts) {
                        String[] parts = sort.split(",");
                        if (parts.length > 2 || !SORT_FIELDS.contains(parts[0])
                                || parts.length == 2 && !Set.of("asc", "desc").contains(parts[1].toLowerCase())) {
                            throw new IllegalArgumentException("Недопустимая сортировка");
                        }
                    }
                }
                return true;
            }
        }).addPathPatterns("/api/v1/**");
    }
}
