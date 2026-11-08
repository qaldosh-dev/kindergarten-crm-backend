package kz.kindergarten.common;

import java.time.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class BusinessTime {
    private final Clock clock;
    private final ZoneId zone;

    public BusinessTime(Clock clock, @Value("${app.timezone}") String timezone) {
        this.clock = clock;
        this.zone = ZoneId.of(timezone);
    }

    public Instant now() {
        return clock.instant();
    }

    public LocalDate today() {
        return LocalDate.now(clock.withZone(zone));
    }
}
