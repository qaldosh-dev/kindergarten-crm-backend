package kz.kindergarten.bootstrap;

import java.time.*;
import java.util.List;
import kz.kindergarten.auth.*;
import kz.kindergarten.children.*;
import kz.kindergarten.common.BusinessTime;
import kz.kindergarten.groups.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BootstrapService {
    public record Result(Long adminId, boolean seedFinance, List<Long> childIds) {}

    private final UserRepository users;
    private final GroupRepository groups;
    private final AssignmentRepository assignments;
    private final ChildRepository children;
    private final ContactRepository contacts;
    private final MembershipRepository memberships;
    private final PasswordEncoder passwords;
    private final Environment environment;
    private final BusinessTime time;
    private final String adminLogin;
    private final String adminPassword;

    public BootstrapService(UserRepository users, GroupRepository groups, AssignmentRepository assignments,
                             ChildRepository children, ContactRepository contacts, MembershipRepository memberships,
                             PasswordEncoder passwords, Environment environment, BusinessTime time,
                             @Value("${app.admin-login}") String adminLogin, @Value("${app.admin-password}") String adminPassword) {
        this.users = users;
        this.groups = groups;
        this.assignments = assignments;
        this.children = children;
        this.contacts = contacts;
        this.memberships = memberships;
        this.passwords = passwords;
        this.environment = environment;
        this.time = time;
        this.adminLogin = adminLogin;
        this.adminPassword = adminPassword;
    }

    @Transactional
    public Result initialize() {
        boolean demo = environment.acceptsProfiles(Profiles.of("demo"));
        if (!demo) {
            if (!users.existsByRole("ADMIN")) {
                if (adminLogin.isBlank() || adminPassword.length() < 10 || adminPassword.length() > 72) {
                    throw new IllegalStateException("First production startup requires ADMIN_LOGIN and ADMIN_PASSWORD (10..72 characters)");
                }
                createUser(adminLogin, adminPassword, "ADMIN", true);
            }
            return new Result(null, false, List.of());
        }
        var admin = users.findByLogin("admin@demo.local").orElseGet(() -> createUser("admin@demo.local", "DemoAdmin2026!", "ADMIN", false));
        var teacher = users.findByLogin("teacher@demo.local").orElseGet(() -> createUser("teacher@demo.local", "DemoTeacher2026!", "TEACHER", false));
        var secondTeacher = users.findByLogin("teacher2@demo.local").orElseGet(() -> createUser("teacher2@demo.local", "DemoTeacher2026!", "TEACHER", false));
        if (children.count() != 0) {
            return new Result(admin.getId(), false, List.of());
        }
        var month = YearMonth.from(time.today());
        var firstGroup = createGroup("Демо: Звёздочки");
        var secondGroup = createGroup("Демо: Облачка");
        assign(teacher, firstGroup, month.minusMonths(3).atDay(1));
        assign(secondTeacher, secondGroup, month.minusMonths(3).atDay(1));
        var childIds = List.of(
                createChild("Демо Ребёнок Первый", month.atDay(15).minusYears(1), month.minusMonths(2).atDay(1), null, firstGroup),
                createChild("Демо Ребёнок Второй", month.atDay(20).minusYears(2), month.minusMonths(2).atDay(1), null, firstGroup),
                createChild("Демо Ребёнок Третий", month.atDay(10).minusYears(5), month.minusMonths(2).atDay(1), null, secondGroup),
                createChild("Демо Ребёнок Четвёртый", month.atDay(12).minusYears(3), month.atDay(12), null, secondGroup),
                createChild("Демо Ребёнок Пятый", month.atDay(5).minusYears(4), month.minusMonths(2).atDay(1), month.atDay(16), firstGroup));
        return new Result(admin.getId(), true, childIds);
    }

    private UserEntity createUser(String login, String password, String role, boolean mustChange) {
        var user = new UserEntity();
        user.setLogin(login);
        user.setPasswordHash(passwords.encode(password));
        user.setRole(role);
        user.setMustChangePassword(mustChange);
        return users.saveAndFlush(user);
    }

    private GroupEntity createGroup(String name) {
        var group = new GroupEntity();
        group.setName(name);
        return groups.saveAndFlush(group);
    }

    private void assign(UserEntity teacher, GroupEntity group, LocalDate start) {
        var assignment = new TeacherAssignment();
        assignment.setTeacher(teacher);
        assignment.setGroup(group);
        assignment.setValidFrom(start);
        assignments.save(assignment);
    }

    private Long createChild(String name, LocalDate birthDate, LocalDate admissionDate, LocalDate withdrawalDate, GroupEntity group) {
        var child = new ChildEntity();
        child.setFullName(name);
        child.setBirthDate(birthDate);
        child.setAdmissionDate(admissionDate);
        child.setWithdrawalDate(withdrawalDate);
        child.setComment("Полностью вымышленные демонстрационные данные");
        children.saveAndFlush(child);
        var contact = new ChildContact();
        contact.setChild(child);
        contact.setRepresentativeName("Демо Представитель");
        contact.setPhone("+7 000 000 00 00");
        contact.setRelation("PARENT");
        contacts.save(contact);
        var membership = new Membership();
        membership.setChild(child);
        membership.setGroup(group);
        membership.setValidFrom(admissionDate);
        membership.setValidTo(withdrawalDate);
        memberships.save(membership);
        return child.getId();
    }
}
