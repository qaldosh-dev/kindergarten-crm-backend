package kz.kindergarten.groups;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public final class GroupDtos {
    private GroupDtos() {}

    public record GroupView(Long id, String name, boolean active, Long version) {}
    public record CreateGroup(@NotBlank @Size(max = 160) String name) {}
    public record UpdateGroup(@NotBlank @Size(max = 160) String name, @NotNull Boolean active, @NotNull Long version) {}
    public record CreateAssignment(@NotNull Long teacherId, @NotNull LocalDate validFrom, LocalDate validTo) {}
    public record UpdateAssignment(@NotNull LocalDate validFrom, LocalDate validTo) {}
    public record AssignmentView(Long id, Long teacherId, String teacherLogin, Long groupId, LocalDate validFrom, LocalDate validTo) {}
}
