package kz.kindergarten.auth;

import org.mapstruct.Mapper;
import kz.kindergarten.auth.AuthDtos.*;

@Mapper(componentModel = "spring")
public interface UserMapper {
    UserView view(UserEntity entity);
    LoginUser loginUser(UserEntity entity);
}
