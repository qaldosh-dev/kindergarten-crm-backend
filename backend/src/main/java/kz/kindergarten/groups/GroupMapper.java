package kz.kindergarten.groups;

import org.mapstruct.*;
import kz.kindergarten.groups.GroupDtos.*;

@Mapper(componentModel = "spring")
public interface GroupMapper {
    GroupView view(GroupEntity entity);

    @Mapping(target = "teacherId", source = "teacher.id")
    @Mapping(target = "teacherLogin", source = "teacher.login")
    @Mapping(target = "groupId", source = "group.id")
    AssignmentView assignment(TeacherAssignment entity);
}
