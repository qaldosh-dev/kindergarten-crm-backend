package kz.kindergarten.attendance;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.List;

public final class AttendanceDtos {
    private AttendanceDtos() {}

    public enum Status { PRESENT, ABSENT }
    public record Mark(@NotNull Long childId, @NotNull Status status, Long version) {}
    public record SaveAttendance(@NotNull @Size(max = 500) List<@Valid Mark> items, @Size(max = 10000) String reason) {}
    public record AttendanceItem(Long childId, String fullName, String status, Long version, Instant updatedAt, String updatedBy) {}
    public record GroupAttendance(long groupId, LocalDate date, boolean workingDay, boolean closed, List<AttendanceItem> items) {}
}
