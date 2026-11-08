package kz.kindergarten.children;

import java.util.List;
import org.mapstruct.*;
import kz.kindergarten.children.ChildDtos.*;

@Mapper(componentModel = "spring")
public interface ChildMapper {
    ContactView contact(ChildContact entity);

    @Mapping(target = "groupId", source = "group.id")
    @Mapping(target = "groupName", source = "group.name")
    MembershipView membership(Membership entity);

    @Mapping(target = "id", source = "child.id")
    @Mapping(target = "version", source = "child.version")
    @Mapping(target = "groupId", source = "membership.group.id")
    @Mapping(target = "groupName", source = "membership.group.name")
    @Mapping(target = "contacts", source = "contacts")
    ChildView view(ChildEntity child, Membership membership, List<ContactView> contacts);
}
