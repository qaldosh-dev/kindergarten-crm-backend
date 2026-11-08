package kz.kindergarten.illness;

import jakarta.validation.constraints.*;
import java.time.*;

public final class IllnessDtos {
    private IllnessDtos() {}

    public record ConfirmIllness(@NotNull LocalDate dateFrom, @NotNull LocalDate dateTo, @NotNull LocalDate receivedOn,
                                 @Size(max = 10000) String lateReason, boolean confirmAttendanceOverride) {}
    public record Revoke(@NotBlank @Size(max = 10000) String reason) {}
    public record CertificateView(Long id, Long childId, LocalDate dateFrom, LocalDate dateTo, LocalDate receivedOn,
                                  Instant confirmedAt, String lateReason, Instant revokedAt, String revocationReason) {}
}
