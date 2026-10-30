package com.chatApp.cloudChat.controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.chatApp.cloudChat.security.AppUserPrincipal;
import com.chatApp.cloudChat.service.NebulaService;
import java.util.*;
@RestController @RequestMapping("/api/v1/nebula")
public class NebulaController {
 private final NebulaService service;
 public NebulaController(NebulaService service){this.service=service;}
 @GetMapping public List<Map<String,Object>> list(@AuthenticationPrincipal AppUserPrincipal u){return service.list(u.getId());}
 @PostMapping public Map<String,Object> create(@RequestBody Map<String,Object> body,@AuthenticationPrincipal AppUserPrincipal u){return service.create(u.getId(),body);}
 @PatchMapping("/{id}") public Map<String,Object> update(@PathVariable String id,@RequestBody Map<String,Object> body,@AuthenticationPrincipal AppUserPrincipal u){return service.update(u.getId(),id,body);}
}
