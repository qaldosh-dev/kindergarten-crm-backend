package kz.kindergarten.audit;

import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface AuditMapper {
    @Mapping(target = "actorId", source = "actor.id")
    @Mapping(target = "before", source = "beforeValue")
    @Mapping(target = "after", source = "afterValue")
    AuditView view(AuditEvent entity);
}
