package kz.kindergarten.children;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public final class ChildDtos {
    private ChildDtos() {}

    public record ContactInput(Long id, @NotBlank @Size(max = 250) String representativeName,
                               @NotBlank @Size(max = 60) String phone, @NotBlank @Size(max = 60) String relation,
                               @Size(max = 10000) String comment) {}
    public record ContactView(Long id, String representativeName, String phone, String relation, String comment) {}
    public record CreateChild(@NotBlank @Size(max = 250) String fullName, @NotNull @PastOrPresent LocalDate birthDate,
                              @NotNull LocalDate admissionDate, @NotNull Long groupId, @Size(max = 10000) String comment,
                              @NotNull @Size(max = 20) List<@Valid ContactInput> contacts) {}
    public record UpdateChild(@NotBlank @Size(max = 250) String fullName, @NotNull @PastOrPresent LocalDate birthDate,
                              @NotNull LocalDate admissionDate, @Size(max = 10000) String comment,
                              @NotNull @Size(max = 20) List<@Valid ContactInput> contacts, @NotNull Long version) {}
    public record Withdrawal(LocalDate withdrawalDate, @NotNull Long version) {}
    public record Transfer(@NotNull Long groupId, @NotNull LocalDate validFrom) {}
    public record CorrectMembership(@NotNull Long groupId, @NotNull LocalDate validFrom, LocalDate validTo,
                                    @NotBlank @Size(max = 10000) String reason) {}
    public record MembershipView(Long id, Long groupId, String groupName, LocalDate validFrom, LocalDate validTo) {}
    public record ChildView(Long id, String fullName, LocalDate birthDate, LocalDate admissionDate, LocalDate withdrawalDate,
                            Long groupId, String groupName, String comment, List<ContactView> contacts, Long version) {}
}
